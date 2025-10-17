```fortran
subroutine dposvx (
        character fact,
        character uplo,
        integer n,
        integer nrhs,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldaf, * ) af,
        integer ldaf,
        character equed,
        double precision, dimension( * ) s,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision rcond,
        double precision, dimension( * ) ferr,
        double precision, dimension( * ) berr,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DPOSVX uses the Cholesky factorization A = U\*\*T\*U or A = L\*L\*\*T to
compute the solution to a real system of linear equations
A \* X = B,
where A is an N-by-N symmetric positive definite matrix and X and B
are N-by-NRHS matrices.

Error bounds on the solution and a condition estimate are also
provided.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of the matrix A is
> supplied on entry, and if not, whether the matrix A should be
> equilibrated before it is factored.
> = 'F':  On entry, AF contains the factored form of A.
> If EQUED = 'Y', the matrix A has been equilibrated
> with scaling factors given by S.  A and AF will not
> be modified.
> = 'N':  The matrix A will be copied to AF and factored.
> = 'E':  The matrix A will be equilibrated if necessary, then
> copied to AF and factored.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A, except if FACT = 'F' and
> EQUED = 'Y', then A must contain the equilibrated matrix
> diag(S)\*A\*diag(S).  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.  A is not modified if
> FACT = 'F' or 'N', or if FACT = 'E' and EQUED = 'N' on exit.
> 
> On exit, if FACT = 'E' and EQUED = 'Y', A is overwritten by
> diag(S)\*A\*diag(S).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : DOUBLE PRECISION array, dimension (LDAF,N) [in,out]
> If FACT = 'F', then AF is an input argument and on entry
> contains the triangular factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T, in the same storage
> format as A.  If EQUED .ne. 'N', then AF is the factored form
> of the equilibrated matrix diag(S)\*A\*diag(S).
> 
> If FACT = 'N', then AF is an output argument and on exit
> returns the triangular factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T of the original
> matrix A.
> 
> If FACT = 'E', then AF is an output argument and on exit
> returns the triangular factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T of the equilibrated
> matrix A (see the description of A for the form of the
> equilibrated matrix).

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

EQUED : CHARACTER\*1 [in,out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration (always true if FACT = 'N').
> = 'Y':  Equilibration was done, i.e., A has been replaced by
> diag(S) \* A \* diag(S).
> EQUED is an input argument if FACT = 'F'; otherwise, it is an
> output argument.

S : DOUBLE PRECISION array, dimension (N) [in,out]
> The scale factors for A; not accessed if EQUED = 'N'.  S is
> an input argument if FACT = 'F'; otherwise, S is an output
> argument.  If FACT = 'F' and EQUED = 'Y', each element of S
> must be positive.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if EQUED = 'N', B is not modified; if EQUED = 'Y',
> B is overwritten by diag(S) \* B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [out]
> If INFO = 0 or INFO = N+1, the N-by-NRHS solution matrix X to
> the original system of equations.  Note that if EQUED = 'Y',
> A and B are modified on exit, and the solution to the
> equilibrated system is inv(diag(S))\*X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : DOUBLE PRECISION [out]
> The estimate of the reciprocal condition number of the matrix
> A after equilibration (if done).  If RCOND is less than the
> machine precision (in particular, if RCOND = 0), the matrix
> is singular to working precision.  This condition is
> indicated by a return code of INFO > 0.

FERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The estimated forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).  The estimate is as reliable as
> the estimate for RCOND, and is almost always a slight
> overestimate of the true error.

BERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : DOUBLE PRECISION array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, and i is
> <= N:  the leading principal minor of order i of A
> is not positive, so the factorization could not
> be completed, and the solution has not been
> computed. RCOND = 0 is returned.
> = N+1: U is nonsingular, but RCOND is less than machine
> precision, meaning that the matrix is singular
> to working precision.  Nevertheless, the
> solution and error bounds are computed because
> there are a number of situations where the
> computed solution can be more accurate than the
> value of RCOND would suggest.
