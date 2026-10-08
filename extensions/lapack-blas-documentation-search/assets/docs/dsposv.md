```fortran
subroutine dsposv (
        character uplo,
        integer n,
        integer nrhs,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision, dimension( n, * ) work,
        real, dimension( * ) swork,
        integer iter,
        integer info
)
```

DSPOSV computes the solution to a real system of linear equations
A \* X = B,
where A is an N-by-N symmetric positive definite matrix and X and B
are N-by-NRHS matrices.

DSPOSV first attempts to factorize the matrix in SINGLE PRECISION
and use this factorization within an iterative refinement procedure
to produce a solution with DOUBLE PRECISION normwise backward error
quality (see below). If the approach fails the method switches to a
DOUBLE PRECISION factorization and solve.

The iterative refinement is not going to be a winning strategy if
the ratio SINGLE PRECISION performance over DOUBLE PRECISION
performance is too small. A reasonable strategy should take the
number of right-hand sides and the size of the matrix into account.
This might be done with a call to ILAENV in the future. Up to now, we
always try iterative refinement.

The iterative refinement process is stopped if
ITER > ITERMAX
or for all the RHS we have:
RNRM < SQRT(N)\*XNRM\*ANRM\*EPS\*BWDMAX
where
o ITER is the number of the current iteration in the iterative
refinement process
o RNRM is the infinity-norm of the residual
o XNRM is the infinity-norm of the solution
o ANRM is the infinity-operator-norm of the matrix A
o EPS is the machine epsilon returned by DLAMCH('Epsilon')
The value ITERMAX and BWDMAX are fixed to 30 and 1.0D+00
respectively.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : DOUBLE PRECISION array, [in,out]
> dimension (LDA,N)
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> N-by-N upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading N-by-N lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> On exit, if iterative refinement has been successfully used
> (INFO = 0 and ITER >= 0, see description below), then A is
> unchanged, if double precision factorization has been used
> (INFO = 0 and ITER < 0, see description below), then the
> array A contains the factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in]
> The N-by-NRHS right hand side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [out]
> If INFO = 0, the N-by-NRHS solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

WORK : DOUBLE PRECISION array, dimension (N,NRHS) [out]
> This array is used to hold the residual vectors.

SWORK : REAL array, dimension (N\*(N+NRHS)) [out]
> This array is used to use the single precision matrix and the
> right-hand sides or solutions in single precision.

ITER : INTEGER [out]
> < 0: iterative refinement has failed, double precision
> factorization has been performed
> -1 : the routine fell back to full precision for
> implementation- or machine-specific reasons
> -2 : narrowing the precision induced an overflow,
> the routine fell back to full precision
> -3 : failure of SPOTRF
> -31: stop the iterative refinement after the 30th
> iterations
> > 0: iterative refinement has been successfully used.
> Returns the number of iterations

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the leading principal minor of order i
> of (DOUBLE PRECISION) A is not positive, so the
> factorization could not be completed, and the solution
> has not been computed.
