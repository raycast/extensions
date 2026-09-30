```fortran
subroutine chptri (
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        integer, dimension( * ) ipiv,
        complex, dimension( * ) work,
        integer info
)
```

CHPTRI computes the inverse of a complex Hermitian indefinite matrix
A in packed storage using the factorization A = U\*D\*U\*\*H or
A = L\*D\*L\*\*H computed by CHPTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*H;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*H.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the block diagonal matrix D and the multipliers
> used to obtain the factor U or L as computed by CHPTRF,
> stored as a packed triangular matrix.
> 
> On exit, if INFO = 0, the (Hermitian) inverse of the original
> matrix, stored as a packed triangular matrix. The j-th column
> of inv(A) is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = inv(A)(i,j) for 1<=i<=j;
> if UPLO = 'L',
> AP(i + (j-1)\*(2n-j)/2) = inv(A)(i,j) for j<=i<=n.

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by CHPTRF.

WORK : COMPLEX array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> > 0: if INFO = i, D(i,i) = 0; the matrix is singular and its
> inverse could not be computed.
