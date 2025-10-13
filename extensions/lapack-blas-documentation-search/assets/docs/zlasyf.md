```fortran
subroutine zlasyf (
        character uplo,
        integer n,
        integer nb,
        integer kb,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex*16, dimension( ldw, * ) w,
        integer ldw,
        integer info
)
```

ZLASYF computes a partial factorization of a complex symmetric matrix
A using the Bunch-Kaufman diagonal pivoting method. The partial
factorization has the form:

A  =  ( I  U12 ) ( A11  0  ) (  I       0    )  if UPLO = 'U', or:
( 0  U22 ) (  0   D  ) ( U12\*\*T U22\*\*T )

A  =  ( L11  0 ) ( D    0  ) ( L11\*\*T L21\*\*T )  if UPLO = 'L'
( L21  I ) ( 0   A22 ) (  0       I    )

where the order of D is at most NB. The actual order is returned in
the argument KB, and is either NB or NB-1, or N if N <= NB.
Note that U\*\*T denotes the transpose of U.

ZLASYF is an auxiliary routine called by ZSYTRF. It uses blocked code
(calling Level 3 BLAS) to update the submatrix A11 (if UPLO = 'U') or
A22 (if UPLO = 'L').

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored:
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NB : INTEGER [in]
> The maximum number of columns of the matrix A that should be
> factored.  NB should be at least 2 to allow for 2-by-2 pivot
> blocks.

KB : INTEGER [out]
> The number of columns of A that were actually factored.
> KB is either NB-1 or NB, or N if N <= NB.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> n-by-n upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading n-by-n lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> On exit, A contains details of the partial factorization.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [out]
> Details of the interchanges and the block structure of D.
> 
> If UPLO = 'U':
> Only the last KB elements of IPIV are set.
> 
> If IPIV(k) > 0, then rows and columns k and IPIV(k) were
> interchanged and D(k,k) is a 1-by-1 diagonal block.
> 
> If IPIV(k) = IPIV(k-1) < 0, then rows and columns
> k-1 and -IPIV(k) were interchanged and D(k-1:k,k-1:k)
> is a 2-by-2 diagonal block.
> 
> If UPLO = 'L':
> Only the first KB elements of IPIV are set.
> 
> If IPIV(k) > 0, then rows and columns k and IPIV(k) were
> interchanged and D(k,k) is a 1-by-1 diagonal block.
> 
> If IPIV(k) = IPIV(k+1) < 0, then rows and columns
> k+1 and -IPIV(k) were interchanged and D(k:k+1,k:k+1)
> is a 2-by-2 diagonal block.

W : COMPLEX\*16 array, dimension (LDW,NB) [out]

LDW : INTEGER [in]
> The leading dimension of the array W.  LDW >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> > 0: if INFO = k, D(k,k) is exactly zero.  The factorization
> has been completed, but the block diagonal matrix D is
> exactly singular.
