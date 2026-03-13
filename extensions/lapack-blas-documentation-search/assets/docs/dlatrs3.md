```fortran
subroutine dlatrs3 (
        character uplo,
        character trans,
        character diag,
        character normin,
        integer n,
        integer nrhs,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision, dimension( * ) scale,
        double precision, dimension( * ) cnorm,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DLATRS3 solves one of the triangular systems

A \* X = B \* diag(scale)  or  A\*\*T \* X = B \* diag(scale)

with scaling to prevent overflow.  Here A is an upper or lower
triangular matrix, A\*\*T denotes the transpose of A. X and B are
n by nrhs matrices and scale is an nrhs element vector of scaling
factors. A scaling factor scale(j) is usually less than or equal
to 1, chosen such that X(:,j) is less than the overflow threshold.
If the matrix A is singular (A(j,j) = 0 for some j), then
a non-trivial solution to A\*X = 0 is returned. If the system is
so badly scaled that the solution cannot be represented as
(1/scale(k))\*X(:,k), then x(:,k) = 0 and scale(k) is returned.

This is a BLAS-3 version of LATRS for solving several right
hand sides simultaneously.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the matrix A is upper or lower triangular.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

TRANS : CHARACTER\*1 [in]
> Specifies the operation applied to A.
> = 'N':  Solve A \* x = s\*b  (No transpose)
> = 'T':  Solve A\*\*T\* x = s\*b  (Transpose)
> = 'C':  Solve A\*\*T\* x = s\*b  (Conjugate transpose = Transpose)

DIAG : CHARACTER\*1 [in]
> Specifies whether or not the matrix A is unit triangular.
> = 'N':  Non-unit triangular
> = 'U':  Unit triangular

NORMIN : CHARACTER\*1 [in]
> Specifies whether CNORM has been set or not.
> = 'Y':  CNORM contains the column norms on entry
> = 'N':  CNORM is not set on entry.  On exit, the norms will
> be computed and stored in CNORM.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of columns of X.  NRHS >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The triangular matrix A.  If UPLO = 'U', the leading n by n
> upper triangular part of the array A contains the upper
> triangular matrix, and the strictly lower triangular part of
> A is not referenced.  If UPLO = 'L', the leading n by n lower
> triangular part of the array A contains the lower triangular
> matrix, and the strictly upper triangular part of A is not
> referenced.  If DIAG = 'U', the diagonal elements of A are
> also not referenced and are assumed to be 1.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max (1,N).

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [in,out]
> On entry, the right hand side B of the triangular system.
> On exit, X is overwritten by the solution matrix X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max (1,N).

SCALE : DOUBLE PRECISION array, dimension (NRHS) [out]
> The scaling factor s(k) is for the triangular system
> A \* x(:,k) = s(k)\*b(:,k)  or  A\*\*T\* x(:,k) = s(k)\*b(:,k).
> If SCALE = 0, the matrix A is singular or badly scaled.
> If A(j,j) = 0 is encountered, a non-trivial vector x(:,k)
> that is an exact or approximate solution to A\*x(:,k) = 0
> is returned. If the system so badly scaled that solution
> cannot be presented as x(:,k) \* 1/s(k), then x(:,k) = 0
> is returned.

CNORM : DOUBLE PRECISION array, dimension (N) [in,out]
> 
> If NORMIN = 'Y', CNORM is an input argument and CNORM(j)
> contains the norm of the off-diagonal part of the j-th column
> of A.  If TRANS = 'N', CNORM(j) must be greater than or equal
> to the infinity-norm, and if TRANS = 'T' or 'C', CNORM(j)
> must be greater than or equal to the 1-norm.
> 
> If NORMIN = 'N', CNORM is an output argument and CNORM(j)
> returns the 1-norm of the offdiagonal part of the j-th column
> of A.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)). [out]
> On exit, if INFO = 0, WORK(1) returns the optimal size of
> WORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> 
> If MIN(N,NRHS) = 0, LWORK >= 1, else
> LWORK >= MAX(1, 2\*NBA \* MAX(NBA, MIN(NRHS, 32)), where
> NBA = (N + NB - 1)/NB and NB is the optimal block size.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal dimensions of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -k, the k-th argument had an illegal value
