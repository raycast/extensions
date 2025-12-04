```fortran
subroutine zlatrs (
        character uplo,
        character trans,
        character diag,
        character normin,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) x,
        double precision scale,
        double precision, dimension( * ) cnorm,
        integer info
)
```

ZLATRS solves one of the triangular systems

A \* x = s\*b,  A\*\*T \* x = s\*b,  or  A\*\*H \* x = s\*b,

with scaling to prevent overflow.  Here A is an upper or lower
triangular matrix, A\*\*T denotes the transpose of A, A\*\*H denotes the
conjugate transpose of A, x and b are n-element vectors, and s is a
scaling factor, usually less than or equal to 1, chosen so that the
components of x will be less than the overflow threshold.  If the
unscaled problem will not cause overflow, the Level 2 BLAS routine
ZTRSV is called. If the matrix A is singular (A(j,j) = 0 for some j),
then s is set to 0 and a non-trivial solution to A\*x = 0 is returned.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the matrix A is upper or lower triangular.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

TRANS : CHARACTER\*1 [in]
> Specifies the operation applied to A.
> = 'N':  Solve A \* x = s\*b     (No transpose)
> = 'T':  Solve A\*\*T \* x = s\*b  (Transpose)
> = 'C':  Solve A\*\*H \* x = s\*b  (Conjugate transpose)

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

A : COMPLEX\*16 array, dimension (LDA,N) [in]
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

X : COMPLEX\*16 array, dimension (N) [in,out]
> On entry, the right hand side b of the triangular system.
> On exit, X is overwritten by the solution vector x.

SCALE : DOUBLE PRECISION [out]
> The scaling factor s for the triangular system
> A \* x = s\*b,  A\*\*T \* x = s\*b,  or  A\*\*H \* x = s\*b.
> If SCALE = 0, the matrix A is singular or badly scaled, and
> the vector x is an exact or approximate solution to A\*x = 0.

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

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -k, the k-th argument had an illegal value
