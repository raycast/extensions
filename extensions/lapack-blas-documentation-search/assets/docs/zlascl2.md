```fortran
subroutine zlascl2 (
        integer m,
        integer n,
        double precision, dimension( * ) d,
        complex*16, dimension( ldx, * ) x,
        integer ldx
)
```

ZLASCL2 performs a diagonal scaling on a matrix:
x <-- D \* x
where the DOUBLE PRECISION diagonal matrix D is stored as a vector.

Eventually to be replaced by BLAS_zge_diag_scale in the new BLAS
standard.

## Parameters
M : INTEGER [in]
> The number of rows of D and X. M >= 0.

N : INTEGER [in]
> The number of columns of X. N >= 0.

D : DOUBLE PRECISION array, length M [in]
> Diagonal matrix D, stored as a vector of length M.

X : COMPLEX\*16 array, dimension (LDX,N) [in,out]
> On entry, the matrix X to be scaled by D.
> On exit, the scaled matrix.

LDX : INTEGER [in]
> The leading dimension of the matrix X. LDX >= M.
