```fortran
subroutine cgesvx (
        character fact,
        character trans,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        character equed,
        real, dimension( * ) r,
        real, dimension( * ) c,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldx, * ) x,
        integer ldx,
        real rcond,
        real, dimension( * ) ferr,
        real, dimension( * ) berr,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CGESVX uses the LU factorization to compute the solution to a complex
system of linear equations
A \* X = B,
where A is an N-by-N matrix and X and B are N-by-NRHS matrices.

Error bounds on the solution and a condition estimate are also
provided.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of the matrix A is
> supplied on entry, and if not, whether the matrix A should be
> equilibrated before it is factored.
> = 'F':  On entry, AF and IPIV contain the factored form of A.
> If EQUED is not 'N', the matrix A has been
> equilibrated with scaling factors given by R and C.
> A, AF, and IPIV are not modified.
> = 'N':  The matrix A will be copied to AF and factored.
> = 'E':  The matrix A will be equilibrated if necessary, then
> copied to AF and factored.

TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.  If FACT = 'F' and EQUED is
> not 'N', then A must have been equilibrated by the scaling
> factors in R and/or C.  A is not modified if FACT = 'F' or
> 'N', or if FACT = 'E' and EQUED = 'N' on exit.
> 
> On exit, if EQUED .ne. 'N', A is scaled as follows:
> EQUED = 'R':  A := diag(R) \* A
> EQUED = 'C':  A := A \* diag(C)
> EQUED = 'B':  A := diag(R) \* A \* diag(C).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX array, dimension (LDAF,N) [in,out]
> If FACT = 'F', then AF is an input argument and on entry
> contains the factors L and U from the factorization
> A = P\*L\*U as computed by CGETRF.  If EQUED .ne. 'N', then
> AF is the factored form of the equilibrated matrix A.
> 
> If FACT = 'N', then AF is an output argument and on exit
> returns the factors L and U from the factorization A = P\*L\*U
> of the original matrix A.
> 
> If FACT = 'E', then AF is an output argument and on exit
> returns the factors L and U from the factorization A = P\*L\*U
> of the equilibrated matrix A (see the description of A for
> the form of the equilibrated matrix).

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in,out]
> If FACT = 'F', then IPIV is an input argument and on entry
> contains the pivot indices from the factorization A = P\*L\*U
> as computed by CGETRF; row i of the matrix was interchanged
> with row IPIV(i).
> 
> If FACT = 'N', then IPIV is an output argument and on exit
> contains the pivot indices from the factorization A = P\*L\*U
> of the original matrix A.
> 
> If FACT = 'E', then IPIV is an output argument and on exit
> contains the pivot indices from the factorization A = P\*L\*U
> of the equilibrated matrix A.

EQUED : CHARACTER\*1 [in,out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration (always true if FACT = 'N').
> = 'R':  Row equilibration, i.e., A has been premultiplied by
> diag(R).
> = 'C':  Column equilibration, i.e., A has been postmultiplied
> by diag(C).
> = 'B':  Both row and column equilibration, i.e., A has been
> replaced by diag(R) \* A \* diag(C).
> EQUED is an input argument if FACT = 'F'; otherwise, it is an
> output argument.

R : REAL array, dimension (N) [in,out]
> The row scale factors for A.  If EQUED = 'R' or 'B', A is
> multiplied on the left by diag(R); if EQUED = 'N' or 'C', R
> is not accessed.  R is an input argument if FACT = 'F';
> otherwise, R is an output argument.  If FACT = 'F' and
> EQUED = 'R' or 'B', each element of R must be positive.

C : REAL array, dimension (N) [in,out]
> The column scale factors for A.  If EQUED = 'C' or 'B', A is
> multiplied on the right by diag(C); if EQUED = 'N' or 'R', C
> is not accessed.  C is an input argument if FACT = 'F';
> otherwise, C is an output argument.  If FACT = 'F' and
> EQUED = 'C' or 'B', each element of C must be positive.

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit,
> if EQUED = 'N', B is not modified;
> if TRANS = 'N' and EQUED = 'R' or 'B', B is overwritten by
> diag(R)\*B;
> if TRANS = 'T' or 'C' and EQUED = 'C' or 'B', B is
> overwritten by diag(C)\*B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : COMPLEX array, dimension (LDX,NRHS) [out]
> If INFO = 0 or INFO = N+1, the N-by-NRHS solution matrix X
> to the original system of equations.  Note that A and B are
> modified on exit if EQUED .ne. 'N', and the solution to the
> equilibrated system is inv(diag(C))\*X if TRANS = 'N' and
> EQUED = 'C' or 'B', or inv(diag(R))\*X if TRANS = 'T' or 'C'
> and EQUED = 'R' or 'B'.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : REAL [out]
> The estimate of the reciprocal condition number of the matrix
> A after equilibration (if done).  If RCOND is less than the
> machine precision (in particular, if RCOND = 0), the matrix
> is singular to working precision.  This condition is
> indicated by a return code of INFO > 0.

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

WORK : COMPLEX array, dimension (2\*N) [out]

RWORK : REAL array, dimension (MAX(1,2\*N)) [out]
> On exit, RWORK(1) contains the reciprocal pivot growth
> factor norm(A)/norm(U). The  norm is
> used. If RWORK(1) is much less than 1, then the stability
> of the LU factorization of the (equilibrated) matrix A
> could be poor. This also means that the solution X, condition
> estimator RCOND, and forward error bound FERR could be
> unreliable. If factorization fails with 0<INFO<=N, then
> RWORK(1) contains the reciprocal pivot growth factor for the
> leading INFO columns of A.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, and i is
> <= N:  U(i,i) is exactly zero.  The factorization has
> been completed, but the factor U is exactly
> singular, so the solution and error bounds
> could not be computed. RCOND = 0 is returned.
> = N+1: U is nonsingular, but RCOND is less than machine
> precision, meaning that the matrix is singular
> to working precision.  Nevertheless, the
> solution and error bounds are computed because
> there are a number of situations where the
> computed solution can be more accurate than the
> value of RCOND would suggest.
