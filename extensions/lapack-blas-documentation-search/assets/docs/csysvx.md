```fortran
subroutine csysvx (
        character fact,
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldx, * ) x,
        integer ldx,
        real rcond,
        real, dimension( * ) ferr,
        real, dimension( * ) berr,
        complex, dimension( * ) work,
        integer lwork,
        real, dimension( * ) rwork,
        integer info
)
```

CSYSVX uses the diagonal pivoting factorization to compute the
solution to a complex system of linear equations A \* X = B,
where A is an N-by-N symmetric matrix and X and B are N-by-NRHS
matrices.

Error bounds on the solution and a condition estimate are also
provided.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of A has been
> supplied on entry.
> = 'F':  On entry, AF and IPIV contain the factored form
> of A.  A, AF and IPIV will not be modified.
> = 'N':  The matrix A will be copied to AF and factored.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> The symmetric matrix A.  If UPLO = 'U', the leading N-by-N
> upper triangular part of A contains the upper triangular part
> of the matrix A, and the strictly lower triangular part of A
> is not referenced.  If UPLO = 'L', the leading N-by-N lower
> triangular part of A contains the lower triangular part of
> the matrix A, and the strictly upper triangular part of A is
> not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX array, dimension (LDAF,N) [in,out]
> If FACT = 'F', then AF is an input argument and on entry
> contains the block diagonal matrix D and the multipliers used
> to obtain the factor U or L from the factorization
> A = U\*D\*U\*\*T or A = L\*D\*L\*\*T as computed by CSYTRF.
> 
> If FACT = 'N', then AF is an output argument and on exit
> returns the block diagonal matrix D and the multipliers used
> to obtain the factor U or L from the factorization
> A = U\*D\*U\*\*T or A = L\*D\*L\*\*T.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in,out]
> If FACT = 'F', then IPIV is an input argument and on entry
> contains details of the interchanges and the block structure
> of D, as determined by CSYTRF.
> If IPIV(k) > 0, then rows and columns k and IPIV(k) were
> interchanged and D(k,k) is a 1-by-1 diagonal block.
> If UPLO = 'U' and IPIV(k) = IPIV(k-1) < 0, then rows and
> columns k-1 and -IPIV(k) were interchanged and D(k-1:k,k-1:k)
> is a 2-by-2 diagonal block.  If UPLO = 'L' and IPIV(k) =
> IPIV(k+1) < 0, then rows and columns k+1 and -IPIV(k) were
> interchanged and D(k:k+1,k:k+1) is a 2-by-2 diagonal block.
> 
> If FACT = 'N', then IPIV is an output argument and on exit
> contains details of the interchanges and the block structure
> of D, as determined by CSYTRF.

B : COMPLEX array, dimension (LDB,NRHS) [in]
> The N-by-NRHS right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX array, dimension (LDX,NRHS) [out]
> If INFO = 0 or INFO = N+1, the N-by-NRHS solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : REAL [out]
> The estimate of the reciprocal condition number of the matrix
> A.  If RCOND is less than the machine precision (in
> particular, if RCOND = 0), the matrix is singular to working
> precision.  This condition is indicated by a return code of
> INFO > 0.

FERR : REAL array, dimension (NRHS) [out]
> The estimated forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).  The estimate is as reliable as
> the estimate for RCOND, and is almost always a slight
> overestimate of the true error.

BERR : REAL array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of WORK.  LWORK >= max(1,2\*N), and for best
> performance, when FACT = 'N', LWORK >= max(1,2\*N,N\*NB), where
> NB is the optimal blocksize for CSYTRF.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : REAL array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, and i is
> <= N:  D(i,i) is exactly zero.  The factorization
> has been completed but the factor D is exactly
> singular, so the solution and error bounds could
> not be computed. RCOND = 0 is returned.
> = N+1: D is nonsingular, but RCOND is less than machine
> precision, meaning that the matrix is singular
> to working precision.  Nevertheless, the
> solution and error bounds are computed because
> there are a number of situations where the
> computed solution can be more accurate than the
> value of RCOND would suggest.
