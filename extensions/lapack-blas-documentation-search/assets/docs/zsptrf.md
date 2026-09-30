```fortran
subroutine zsptrf (
        character uplo,
        integer n,
        complex*16, dimension( * ) ap,
        integer, dimension( * ) ipiv,
        integer info
)
```

ZSPTRF computes the factorization of a complex symmetric matrix A
stored in packed format using the Bunch-Kaufman diagonal pivoting
method:

A = U\*D\*U\*\*T  or  A = L\*D\*L\*\*T

where U (or L) is a product of permutation and unit upper (lower)
triangular matrices, and D is symmetric and block diagonal with
1-by-1 and 2-by-2 diagonal blocks.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, the block diagonal matrix D and the multipliers used
> to obtain the factor U or L, stored as a packed triangular
> matrix overwriting A (see below for further details).

IPIV : INTEGER array, dimension (N) [out]
> Details of the interchanges and the block structure of D.
> If IPIV(k) > 0, then rows and columns k and IPIV(k) were
> interchanged and D(k,k) is a 1-by-1 diagonal block.
> If UPLO = 'U' and IPIV(k) = IPIV(k-1) < 0, then rows and
> columns k-1 and -IPIV(k) were interchanged and D(k-1:k,k-1:k)
> is a 2-by-2 diagonal block.  If UPLO = 'L' and IPIV(k) =
> IPIV(k+1) < 0, then rows and columns k+1 and -IPIV(k) were
> interchanged and D(k:k+1,k:k+1) is a 2-by-2 diagonal block.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, D(i,i) is exactly zero.  The factorization
> has been completed, but the block diagonal matrix D is
> exactly singular, and division by zero will occur if it
> is used to solve a system of equations.
