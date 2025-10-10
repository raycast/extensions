```fortran
subroutine cpptri (
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        integer info
)
```

CPPTRI computes the inverse of a complex Hermitian positive definite
matrix A using the Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H
computed by CPPTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangular factor is stored in AP;
> = 'L':  Lower triangular factor is stored in AP.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the triangular factor U or L from the Cholesky
> factorization A = U\*\*H\*U or A = L\*L\*\*H, packed columnwise as
> a linear array.  The j-th column of U or L is stored in the
> array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = U(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = L(i,j) for j<=i<=n.
> 
> On exit, the upper or lower triangle of the (Hermitian)
> inverse of A, overwriting the input factor U or L.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the (i,i) element of the factor U or L is
> zero, and the inverse could not be computed.
