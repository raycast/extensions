```fortran
subroutine slatps (
        character uplo,
        character trans,
        character diag,
        character normin,
        integer n,
        real, dimension( * ) ap,
        real, dimension( * ) x,
        real scale,
        real, dimension( * ) cnorm,
        integer info
)
```

SLATPS solves one of the triangular systems

A \*x = s\*b  or  A\*\*T\*x = s\*b

with scaling to prevent overflow, where A is an upper or lower
triangular matrix stored in packed form.  Here A\*\*T denotes the
transpose of A, x and b are n-element vectors, and s is a scaling
factor, usually less than or equal to 1, chosen so that the
components of x will be less than the overflow threshold.  If the
unscaled problem will not cause overflow, the Level 2 BLAS routine
STPSV is called. If the matrix A is singular (A(j,j) = 0 for some j),
then s is set to 0 and a non-trivial solution to A\*x = 0 is returned.

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

AP : REAL array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangular matrix A, packed columnwise in
> a linear array.  The j-th column of A is stored in the array
> AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.

X : REAL array, dimension (N) [in,out]
> On entry, the right hand side b of the triangular system.
> On exit, X is overwritten by the solution vector x.

SCALE : REAL [out]
> The scaling factor s for the triangular system
> A \* x = s\*b  or  A\*\*T\* x = s\*b.
> If SCALE = 0, the matrix A is singular or badly scaled, and
> the vector x is an exact or approximate solution to A\*x = 0.

CNORM : REAL array, dimension (N) [in,out]
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
